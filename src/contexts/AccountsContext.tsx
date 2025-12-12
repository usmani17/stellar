import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { accountsService, type Account } from "../services/accounts";

interface AccountsContextType {
  accounts: Account[];
  loading: boolean;
  error: Error | null;
  loadAccounts: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

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
      const error = err instanceof Error ? err : new Error('Failed to load accounts');
      setError(error);
      console.error('Failed to load accounts:', err);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAccounts = useCallback(async () => {
    await loadAccounts();
  }, [loadAccounts]);

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

