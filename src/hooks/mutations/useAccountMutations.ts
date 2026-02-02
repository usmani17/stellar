import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accountsService, type Account, type CreateAccountData } from "../../services/accounts";
import { queryKeys } from "../queries/queryKeys";

/**
 * Mutation hook to create a new account
 * Automatically invalidates accounts list on success
 */
export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation<Account[], Error, CreateAccountData>({
    mutationFn: accountsService.createAccount,
    onSuccess: (accounts) => {
      queryClient.setQueryData<Account[]>(queryKeys.accounts.lists(), accounts);
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
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Account[]>(queryKeys.accounts.lists(), (old) => {
        if (!old) return [];
        return old.filter((a) => a.id !== deletedId);
      });
    },
  });
};
