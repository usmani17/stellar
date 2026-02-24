import { useQuery } from "@tanstack/react-query";
import { googleAdwordsAssetsService, type Asset, type AssetType } from "../../services/googleAdwords/googleAdwordsAssets";
import { queryKeys } from "./queryKeys";

export interface UseAssetsOptions {
  /** Set to false to skip the backend API call (e.g. for assistant text asset selector) */
  enabled?: boolean;
  /** Asset types to exclude from backend query - Google Ads API types (TEXT, CALLOUT, STRUCTURED_SNIPPET, PRICE, etc.) */
  excludeAssetTypes?: string[];
}

/**
 * Hook to fetch assets for a specific profile
 * Uses React Query for caching and automatic state management
 *
 * @param profileId - The profile ID to fetch assets for
 * @param assetType - Optional asset type filter
 * @param options - Optional config, e.g. enabled: false to skip the fetch
 */
export const useAssets = (
  profileId: number | undefined,
  assetType?: AssetType,
  options?: UseAssetsOptions
) => {
  const enabled = (options?.enabled !== false) && !!profileId;
  const excludeAssetTypes = options?.excludeAssetTypes ?? [];
  return useQuery<Asset[], Error>({
    queryKey: profileId
      ? [...queryKeys.assets.lists(profileId, assetType), excludeAssetTypes]
      : ["assets", "list", "disabled"],
    queryFn: async () => {
      if (!profileId) {
        return [];
      }
      const response = await googleAdwordsAssetsService.listAssets(profileId, assetType, excludeAssetTypes.length ? excludeAssetTypes : undefined);
      if (response.success) {
        return response.assets;
      }
      throw new Error("Failed to load assets");
    },
    enabled, // Only run query when enabled and profileId is provided
    staleTime: 60 * 60 * 1000, // 1 hour - cache per account
    gcTime: 2 * 60 * 60 * 1000, // 2 hours - keep in cache
    refetchOnMount: false, // Use cache; user can refresh via button
    refetchOnWindowFocus: false, // Don't refetch on window focus for assets
  });
};
