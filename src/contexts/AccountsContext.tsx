import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const accountsData = await accountsService.getAccounts();
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to load accounts");
      setError(error);
      console.error("Failed to load accounts:", err);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAccounts = useCallback(async () => {
    await loadAccounts();
  }, [loadAccounts]);

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

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  return (
    <AccountsContext.Provider
      value={{
        accounts,
        loading,
        error,
        loadAccounts,
        refreshAccounts,
        getAccountById,
        getCurrentAccount,
      }}
    >
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
