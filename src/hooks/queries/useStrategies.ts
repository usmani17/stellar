import { useQuery } from "@tanstack/react-query";
import {
  strategiesService,
  type Strategy,
} from "../../services/strategies";
import { queryKeys } from "./queryKeys";

export const useStrategiesPaginated = (
  page: number,
  pageSize: number,
  search?: string,
  options?: { enabled?: boolean }
) => {
  const query = useQuery({
    queryKey: queryKeys.strategies.listPaginated(page, pageSize, search ?? ""),
    queryFn: () =>
      strategiesService.getStrategiesPaginated({
        page,
        page_size: pageSize,
        search: search?.trim() || undefined,
      }),
    enabled: options?.enabled ?? true,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) return false;
      return failureCount < 3;
    },
  });
  const data = query.data;
  return {
    strategies: data?.results ?? [],
    totalPages: data?.total_pages ?? 0,
    count: data?.count ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

export const useStrategies = (options?: { enabled?: boolean }) => {
  const query = useQuery<Strategy[], Error>({
    queryKey: queryKeys.strategies.lists(),
    queryFn: () => strategiesService.getStrategies(),
    enabled: options?.enabled ?? true,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
  });

  return {
    strategies: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    isError: query.isError,
    error: query.error,
  };
};

export const useStrategy = (
  strategyId: number | undefined,
  options?: { enabled?: boolean }
) => {
  const query = useQuery<Strategy, Error>({
    queryKey: queryKeys.strategies.detail(strategyId ?? 0),
    queryFn: () => strategiesService.getStrategy(strategyId!),
    enabled: (options?.enabled ?? true) && !!strategyId,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
  });

  return {
    strategy: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
