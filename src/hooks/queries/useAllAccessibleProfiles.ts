import { useQuery } from "@tanstack/react-query";
import { accountsService } from "../../services/accounts";
import { queryKeys } from "./queryKeys";

export type AllAccessibleProfile = Awaited<
  ReturnType<typeof accountsService.getAllAccessibleProfiles>
>[number];

export function useAllAccessibleProfiles(options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: queryKeys.accounts.allAccessibleProfiles(),
    queryFn: () => accountsService.getAllAccessibleProfiles(),
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
    retry: (failureCount, error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) return false;
      return failureCount < 3;
    },
  });

  return {
    profiles: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
