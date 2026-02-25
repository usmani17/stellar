import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../hooks/queries/queryKeys";
import {
  brandSettingsService,
  type BrandReportSettings,
} from "../../../services/workflows";

export const useBrandSettings = (accountId: number | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery<BrandReportSettings, Error>({
    queryKey: accountId
      ? queryKeys.brandSettings.detail(accountId)
      : ["brandSettings", "disabled"],
    queryFn: async () => {
      if (!accountId)
        return { accountId: 0, logoUrl: "", primaryColor: "#136D6D" };
      return brandSettingsService.getBrandSettings(accountId);
    },
    enabled: !!accountId,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Omit<BrandReportSettings, "accountId">>) => {
      if (!accountId) throw new Error("No account selected");
      return brandSettingsService.updateBrandSettings(accountId, payload);
    },
    onSuccess: () => {
      if (accountId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.brandSettings.detail(accountId),
        });
      }
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};
