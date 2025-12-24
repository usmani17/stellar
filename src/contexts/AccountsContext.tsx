import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useAccounts as useAccountsQuery } from "../hooks/queries/useAccounts";
import { accountsService, type Account } from "../services/accounts";
import { getAccountIdFromUrl } from "../utils/urlHelpers";

interface AccountsContextType {
  accounts: Account[];
  loading: boolean;
  error: Error | null;
  loadAccounts: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  getAccountById: (accountId: number) => Account | undefined;
  getCurrentAccount: (pathname: string) => Account | null;
}

const AccountsContext = createContext<AccountsContextType | undefined>(
  undefined
);

export const AccountsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Use React Query hook for accounts data
  const {
    data: accounts = [],
    isLoading: loading,
    error,
    refetch,
  } = useAccountsQuery();

  // loadAccounts is kept for backward compatibility but uses React Query's refetch
  const loadAccounts = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // refreshAccounts is an alias for loadAccounts (backward compatibility)
  const refreshAccounts = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Helper to get account by ID
  const getAccountById = useCallback(
    (accountId: number): Account | undefined => {
      return accounts.find((account) => account.id === accountId);
    },
    [accounts]
  );

  // Helper to get current account from URL pathname
  const getCurrentAccount = useCallback(
    (pathname: string): Account | null => {
      const accountId = getAccountIdFromUrl(pathname);
      if (accountId === null) {
        return null;
      }
      return getAccountById(accountId) || null;
    },
    [getAccountById]
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<AccountsContextType>(
    () => ({
      accounts,
      loading,
      error: error || null,
      loadAccounts,
      refreshAccounts,
      getAccountById,
      getCurrentAccount,
    }),
    [
      accounts,
      loading,
      error,
      loadAccounts,
      refreshAccounts,
      getAccountById,
      getCurrentAccount,
    ]
  );

  return (
    <AccountsContext.Provider value={contextValue}>
      {children}
    </AccountsContext.Provider>
  );
};

export const useAccounts = (): AccountsContextType => {
  const context = useContext(AccountsContext);
  if (context === undefined) {
    throw new Error("useAccounts must be used within an AccountsProvider");
  }
  return context;
};
