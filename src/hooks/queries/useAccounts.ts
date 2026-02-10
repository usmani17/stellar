import { useQuery } from "@tanstack/react-query";
import { accountsService, type Account } from "../../services/accounts";
import { queryKeys } from "./queryKeys";

/**
 * Hook to fetch accounts.
 * Uses React Query for caching and automatic state management.
 *
 * @param options.enabled - Controls whether the query should execute. Defaults to true.
 * @param options.all - If true, fetches all accounts (no pagination) for e.g. brand switcher dropdown. Defaults to false (first page only).
 */
export const useAccounts = (options?: { enabled?: boolean; all?: boolean }) => {
  const fetchAll = options?.all ?? false;
  return useQuery<Account[], Error>({
    queryKey: fetchAll ? queryKeys.accounts.listAll() : queryKeys.accounts.lists(),
    queryFn: async () => {
      const data = await accountsService.getAccounts(fetchAll ? { all: true } : undefined);
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
