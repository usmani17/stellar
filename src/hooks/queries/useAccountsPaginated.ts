import { useQuery } from "@tanstack/react-query";
import {
  accountsService,
  type Account,
  type AccountsPaginatedResponse,
} from "../../services/accounts";
import { queryKeys } from "./queryKeys";

const DEFAULT_PAGE_SIZE = 10;

/**
 * Hook to fetch accounts with page-based pagination (brands page).
 * Same pattern as campaigns: single page per request, number-based pagination.
 */
export const useAccountsPaginated = (
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
  options?: { enabled?: boolean }
) => {
  const query = useQuery<AccountsPaginatedResponse, Error>({
    queryKey: queryKeys.accounts.listPaginated(page, pageSize),
    queryFn: () =>
      accountsService.getAccountsPaginated({ page, page_size: pageSize }),
    enabled: options?.enabled ?? true,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const count = query.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const accounts: Account[] = query.data?.results ?? [];

  return {
    accounts,
    totalCount: count,
    totalPages,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    isError: query.isError,
    error: query.error,
  };
};
