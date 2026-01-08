import { useQuery } from "@tanstack/react-query";
import { accountsService, type Account } from "../../services/accounts";
import { queryKeys } from "./queryKeys";

/**
 * Hook to fetch all accounts
 * Uses React Query for caching and automatic state management
 */
export const useAccounts = () => {
  return useQuery<Account[], Error>({
    queryKey: queryKeys.accounts.lists(),
    queryFn: async () => {
      const data = await accountsService.getAccounts();
      return Array.isArray(data) ? data : [];
    },
  });
};



