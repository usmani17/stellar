import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "../hooks/queries/queryKeys";

/**
 * QueryClient configuration with default options
 * - staleTime: 5 minutes (data considered fresh for 5 minutes)
 * - refetchOnWindowFocus: false (don't refetch when window regains focus)
 * - refetchOnReconnect: false (don't refetch when network reconnects)
 * - refetchOnMount: false (don't refetch if data is fresh)
 * - gcTime: 10 minutes (keep cached data for 10 minutes when inactive)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false, // Use cached data if fresh
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1, // Retry failed requests once
    },
  },
});

/**
 * Drop cached account lists so a new login/session never reuses another user's data.
 * (Global staleTime + refetchOnMount: false would otherwise keep the prior list "fresh".)
 */
export function clearAccountsQueryCache(): void {
  queryClient.removeQueries({ queryKey: queryKeys.accounts.all });
}
