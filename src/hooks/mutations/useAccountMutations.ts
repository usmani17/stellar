import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accountsService, type Account, type CreateAccountData } from "../../services/accounts";
import { queryKeys } from "../queries/queryKeys";

/**
 * Mutation hook to create a new account
 * Automatically invalidates accounts list on success
 */
export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation<Account, Error, CreateAccountData>({
    mutationFn: accountsService.createAccount,
    onSuccess: () => {
      // Invalidate accounts list to refetch updated data
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.lists() });
    },
  });
};

/**
 * Mutation hook to update an account
 * Automatically invalidates accounts list and detail on success
 */
export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation<
    Account,
    Error,
    { id: number; data: Partial<CreateAccountData> }
  >({
    mutationFn: ({ id, data }) => accountsService.updateAccount(id, data),
    onSuccess: (data) => {
      // Invalidate accounts list and detail
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.detail(data.id) });
    },
  });
};

/**
 * Mutation hook to delete an account
 * Automatically invalidates accounts list on success
 */
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, number>({
    mutationFn: accountsService.deleteAccount,
    onSuccess: () => {
      // Invalidate accounts list to refetch updated data
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.lists() });
    },
  });
};
