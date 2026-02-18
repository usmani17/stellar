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
    onSuccess: (newAsset) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.lists(profileId) });
      queryClient.refetchQueries({ queryKey: queryKeys.assets.lists(profileId) });
      if (newAsset) {
        queryClient.setQueriesData<Asset[]>(
          { queryKey: queryKeys.assets.lists(profileId), exact: false },
          (prev) => {
            if (!Array.isArray(prev)) return prev;
            const exists = prev.some((a) => a.id === newAsset.id || a.resource_name === (newAsset as any).resource_name);
            if (exists) return prev;
            return [{ ...newAsset, id: String((newAsset as any).id) } as Asset, ...prev];
          }
        );
      }
    },
  });
};

/**
 * Hook for creating an image asset
 * Updates cache so the new asset appears in the Assets tab and Logo tab immediately.
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
    onSuccess: async (newAsset) => {
      const normalized = newAsset ? normalizeAsset(newAsset) : null;
      const assetKey = queryKeys.assets.lists(profileId);

      // 1. Add the new asset to the cache immediately so it shows in the table
      if (normalized) {
        queryClient.setQueriesData<Asset[]>(
          { queryKey: assetKey, exact: false },
          (prev) => {
            if (!Array.isArray(prev)) return prev;
            const exists = prev.some(
              (a) =>
                String(a.id) === String(normalized.id) ||
                a.resource_name === normalized.resource_name
            );
            if (exists) return prev;
            return [normalized, ...prev];
          }
        );
      }

      // 2. Invalidate and refetch so the list stays in sync with the API
      queryClient.invalidateQueries({ queryKey: assetKey });
      await queryClient.refetchQueries({ queryKey: assetKey });

      // 3. If the API didn't return the new asset yet (e.g. propagation delay), keep it in the cache
      if (normalized) {
        queryClient.setQueriesData<Asset[]>(
          { queryKey: assetKey, exact: false },
          (current) => {
            if (!Array.isArray(current)) return current;
            const hasIt = current.some(
              (a) =>
                String(a.id) === String(normalized.id) ||
                a.resource_name === normalized.resource_name
            );
            if (hasIt) return current;
            return [normalized, ...current];
          }
        );
      }
    },
  });
};

function normalizeAsset(raw: any): Asset {
  const id =
    raw.id != null ? String(raw.id) : (raw.resource_name?.split("/")?.pop() ?? "");
  return {
    id,
    name: raw.name ?? "",
    type: (raw.type ?? "IMAGE") as Asset["type"],
    resource_name: raw.resource_name ?? "",
    ...(raw.image_url && { image_url: raw.image_url }),
    ...(raw.file_size != null && { file_size: raw.file_size }),
    ...(raw.width != null && { width: raw.width }),
    ...(raw.height != null && { height: raw.height }),
    ...(raw.usage && { usage: raw.usage }),
    ...(raw.field_type && { field_type: raw.field_type }),
  };
}

/**
 * Hook for creating a YouTube video asset
 * Invalidates and refetches assets so the new asset appears in the table.
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
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.lists(profileId) });
      queryClient.refetchQueries({ queryKey: queryKeys.assets.lists(profileId) });
    },
  });
};

/**
 * Hook for creating a sitelink asset
 * Invalidates and refetches assets so the new asset appears in the table.
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
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.lists(profileId) });
      queryClient.refetchQueries({ queryKey: queryKeys.assets.lists(profileId) });
    },
  });
};

/**
 * Hook for creating a callout asset
 * Invalidates and refetches assets so the new asset appears in the table.
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
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.lists(profileId) });
      queryClient.refetchQueries({ queryKey: queryKeys.assets.lists(profileId) });
    },
  });
};
