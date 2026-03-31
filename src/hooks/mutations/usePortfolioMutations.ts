import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  portfoliosService,
  type Portfolio,
  type CreatePortfolioPayload,
  type UpdatePortfolioPayload,
} from "../../services/portfolios";
import { queryKeys } from "../queries/queryKeys";

const LIST_PREFIX = ["portfolios", "list"] as const;
const SUMMARY_PREFIX = ["portfolios", "summary"] as const;

export const useCreatePortfolio = (accountId: number) => {
  const queryClient = useQueryClient();

  return useMutation<Portfolio, Error, CreatePortfolioPayload>({
    mutationFn: (data) => portfoliosService.createPortfolio(accountId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_PREFIX });
      queryClient.invalidateQueries({ queryKey: SUMMARY_PREFIX });
    },
  });
};

export const useUpdatePortfolio = (
  accountId: number,
  portfolioId: number,
) => {
  const queryClient = useQueryClient();

  return useMutation<Portfolio, Error, UpdatePortfolioPayload>({
    mutationFn: (data) =>
      portfoliosService.updatePortfolio(accountId, portfolioId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_PREFIX });
      queryClient.invalidateQueries({ queryKey: SUMMARY_PREFIX });
      queryClient.invalidateQueries({
        queryKey: queryKeys.portfolios.detail(portfolioId),
      });
    },
  });
};

export const useDeletePortfolio = (defaultAccountId?: number) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { accountId?: number; portfolioId: number }>({
    mutationFn: ({ accountId, portfolioId }) =>
      portfoliosService.deletePortfolio(accountId ?? defaultAccountId ?? 0, portfolioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_PREFIX });
      queryClient.invalidateQueries({ queryKey: SUMMARY_PREFIX });
    },
  });
};

export const useRunPortfolio = (accountId: number) => {
  const queryClient = useQueryClient();

  return useMutation<
    { status: string; message: string; portfolioId: number; result?: Record<string, unknown> },
    Error,
    number
  >({
    mutationFn: (portfolioId) =>
      portfoliosService.runPortfolio(accountId, portfolioId),
    onSuccess: (_, portfolioId) => {
      queryClient.invalidateQueries({ queryKey: SUMMARY_PREFIX });
      queryClient.invalidateQueries({
        queryKey: queryKeys.portfolios.detail(portfolioId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.portfolios.tracking(portfolioId),
      });
    },
  });
};
