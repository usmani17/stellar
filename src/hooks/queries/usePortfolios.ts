import { useQuery } from "@tanstack/react-query";
import { portfoliosService } from "../../services/portfolios";
import { queryKeys } from "./queryKeys";

export const usePortfolios = (
  page: number,
  pageSize: number,
  search?: string,
  accountId?: number,
  options?: { enabled?: boolean },
) => {
  const query = useQuery({
    queryKey: queryKeys.portfolios.lists(page, pageSize, search, accountId),
    queryFn: () =>
      portfoliosService.getPortfolios({
        page,
        page_size: pageSize,
        search: search || undefined,
        account_id: accountId,
      }),
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    retry: (failureCount, error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) return false;
      return failureCount < 3;
    },
  });

  return {
    portfolios: query.data?.results ?? [],
    count: query.data?.count ?? 0,
    totalPages: query.data?.totalPages ?? 1,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    error: query.error,
  };
};

export const usePortfolioSummary = (
  accountId?: number,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: queryKeys.portfolios.summary(accountId),
    queryFn: () => portfoliosService.getSummary({ account_id: accountId }),
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
};

export const usePortfolio = (
  accountId: number,
  portfolioId: number,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: queryKeys.portfolios.detail(portfolioId),
    queryFn: () => portfoliosService.getPortfolio(accountId, portfolioId),
    enabled: (options?.enabled ?? true) && !!accountId && !!portfolioId,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    retry: (failureCount, error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 3;
    },
  });
};

export const usePortfolioTracking = (
  accountId: number,
  portfolioId: number,
  page: number = 1,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: queryKeys.portfolios.tracking(portfolioId, page),
    queryFn: () =>
      portfoliosService.getTracking(accountId, portfolioId, { page }),
    enabled: (options?.enabled ?? true) && !!accountId && !!portfolioId,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
};
