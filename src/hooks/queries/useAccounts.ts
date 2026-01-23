import { useQuery } from "@tanstack/react-query";
import { accountsService, type Account } from "../../services/accounts";
import { queryKeys } from "./queryKeys";

/**
 * Hook to fetch all accounts
 * Uses React Query for caching and automatic state management
 * 
 * @param options.enabled - Controls whether the query should execute. Defaults to true.
 */
export const useAccounts = (options?: { enabled?: boolean }) => {
  return useQuery<Account[], Error>({
    queryKey: queryKeys.accounts.lists(),
    queryFn: async () => {
      const data = await accountsService.getAccounts();
      return Array.isArray(data) ? data : [];
    },
    enabled: options?.enabled ?? true,
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors (401, 403)
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    },
  });
};
