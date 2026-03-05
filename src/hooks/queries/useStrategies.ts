import { useQuery } from "@tanstack/react-query";
import {
  strategiesService,
  automationsService,
  type Strategy,
  type Automation,
} from "../../services/strategies";
import { queryKeys } from "./queryKeys";

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

export const useAutomations = (
  strategyId: number | undefined,
  options?: { enabled?: boolean }
) => {
  const query = useQuery<Automation[], Error>({
    queryKey: queryKeys.automations.lists(strategyId ?? 0),
    queryFn: () => automationsService.getAutomations(strategyId!),
    enabled: (options?.enabled ?? true) && !!strategyId,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
  });

  return {
    automations: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};
