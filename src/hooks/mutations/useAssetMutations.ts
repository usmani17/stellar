import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  googleAdwordsAssetsService,
  type Asset,
  type CreateTextAssetPayload,
  type CreateImageAssetPayload,
  type CreateYoutubeVideoAssetPayload,
  type CreateSitelinkAssetPayload,
  type CreateCalloutAssetPayload,
} from "../../services/googleAdwords/googleAdwordsAssets";
import { queryKeys } from "../queries/queryKeys";

/**
 * Hook for creating a text asset
 * Automatically invalidates assets cache after successful create
 */
export const useCreateTextAsset = (profileId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      data: CreateTextAssetPayload;
      fieldType?: string;
    }) => {
      const response = await googleAdwordsAssetsService.createTextAsset(
        profileId,
        payload.data,
        payload.fieldType
      );
      if (response.success) {
        return response.asset;
      }
      throw new Error("Failed to create text asset");
    },
    onSuccess: () => {
      // Invalidate all assets queries for this profile to trigger fresh API call
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.assets.all, "list", profileId],
      });
    },
  });
};

/**
 * Hook for creating an image asset
 * Automatically invalidates assets cache after successful create
 */
export const useCreateImageAsset = (profileId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: CreateImageAssetPayload & { fieldType?: string }) => {
      const { fieldType, ...payload } = args;
      const response = await googleAdwordsAssetsService.createImageAsset(
        profileId,
        payload,
        fieldType
      );
      if (response.success) {
        return response.asset;
      }
      throw new Error("Failed to create image asset");
    },
    onSuccess: () => {
      // Invalidate all assets queries for this profile to trigger fresh API call
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.assets.all, "list", profileId],
      });
    },
  });
};

/**
 * Hook for creating a YouTube video asset
 * Automatically invalidates assets cache after successful create
 */
export const useCreateYoutubeVideoAsset = (profileId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateYoutubeVideoAssetPayload) => {
      const response = await googleAdwordsAssetsService.createYoutubeVideoAsset(
        profileId,
        payload
      );
      if (response.success) {
        return response.asset;
      }
      throw new Error("Failed to create YouTube video asset");
    },
    onSuccess: () => {
      // Invalidate all assets queries for this profile to trigger fresh API call
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.assets.all, "list", profileId],
      });
    },
  });
};

/**
 * Hook for creating a sitelink asset
 * Automatically invalidates assets cache after successful create
 */
export const useCreateSitelinkAsset = (profileId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSitelinkAssetPayload) => {
      const response = await googleAdwordsAssetsService.createSitelinkAsset(
        profileId,
        payload
      );
      if (response.success) {
        return response.asset;
      }
      throw new Error("Failed to create sitelink asset");
    },
    onSuccess: () => {
      // Invalidate all assets queries for this profile to trigger fresh API call
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.assets.all, "list", profileId],
      });
    },
  });
};

/**
 * Hook for creating a callout asset
 * Automatically invalidates assets cache after successful create
 */
export const useCreateCalloutAsset = (profileId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCalloutAssetPayload) => {
      const response = await googleAdwordsAssetsService.createCalloutAsset(
        profileId,
        payload
      );
      if (response.success) {
        return response.asset;
      }
      throw new Error("Failed to create callout asset");
    },
    onSuccess: () => {
      // Invalidate all assets queries for this profile to trigger fresh API call
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.assets.all, "list", profileId],
      });
    },
  });
};
