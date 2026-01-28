import { useQuery } from "@tanstack/react-query";
import { googleAdwordsAssetsService, type Asset, type AssetType } from "../../services/googleAdwords/googleAdwordsAssets";
import { queryKeys } from "./queryKeys";

/**
 * Hook to fetch assets for a specific profile
 * Uses React Query for caching and automatic state management
 * 
 * @param profileId - The profile ID to fetch assets for
 * @param assetType - Optional asset type filter
 */
export const useAssets = (
  profileId: number | undefined,
  assetType?: AssetType
) => {
  return useQuery<Asset[], Error>({
    queryKey: profileId
      ? queryKeys.assets.lists(profileId, assetType)
      : ["assets", "list", "disabled"],
    queryFn: async () => {
      if (!profileId) {
        return [];
      }
      const response = await googleAdwordsAssetsService.listAssets(profileId, assetType);
      if (response.success) {
        return response.assets;
      }
      throw new Error("Failed to load assets");
    },
    enabled: !!profileId, // Only run query if profileId is provided
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Don't refetch on window focus for assets
  });
};
