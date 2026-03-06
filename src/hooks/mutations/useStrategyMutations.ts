import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  strategiesService,
  type Strategy,
  type CreateStrategyData,
} from "../../services/strategies";
import { queryKeys } from "../queries/queryKeys";

export const useCreateStrategy = () => {
  const queryClient = useQueryClient();

  return useMutation<Strategy, Error, CreateStrategyData>({
    mutationFn: (data) => strategiesService.createStrategy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategies.all });
    },
  });
};

export const useDuplicateStrategy = () => {
  const queryClient = useQueryClient();

  return useMutation<Strategy, Error, number>({
    mutationFn: (sourceId) => strategiesService.duplicateStrategy(sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategies.all });
    },
  });
};

export const useUpdateStrategy = (id: number) => {
  const queryClient = useQueryClient();

  return useMutation<Strategy, Error, Partial<CreateStrategyData>>({
    mutationFn: (data) => strategiesService.updateStrategy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategies.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.strategies.detail(id) });
    },
  });
};
