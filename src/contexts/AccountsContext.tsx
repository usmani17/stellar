import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { useAccounts as useAccountsQuery } from "../hooks/queries/useAccounts";
import { accountsService, type Account } from "../services/accounts";
import { getAccountIdFromUrl } from "../utils/urlHelpers";
import type { GoogleSheetsIntegration } from "../features/brands/google-sheets/api";

export interface AccountProfileOption {
  channel_id: number;
  channel_name: string;
  channel_type: string;
  id: number;
  name?: string;
  profileId?: string;
  ad_account_id?: string;
  customer_id?: string;
  advertiser_id?: string;
  advertiser_name?: string;
  account_id?: number;
}

interface ProfilesCacheEntry {
  profiles: AccountProfileOption[];
  google_sheets_integrations?: GoogleSheetsIntegration[];
}

interface ProfilesCache {
  [accountId: number]: ProfilesCacheEntry;
}

interface AccountsContextType {
  accounts: Account[];
  loading: boolean;
  error: Error | null;
  loadAccounts: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  getAccountById: (accountId: number) => Account | undefined;
  getCurrentAccount: (pathname: string) => Account | null;
  // Profile-related
  getAccountProfiles: (accountId: number) => Promise<AccountProfileOption[]>;
  getAccountProfilesCached: (accountId: number) => AccountProfileOption[] | undefined;
  getAccountGoogleSheetsIntegrationsCached: (accountId: number) => GoogleSheetsIntegration[] | undefined;
  allAccountsWithProfiles: Array<{
    accountId: number;
    accountName: string;
    profiles: AccountProfileOption[];
    google_sheets_integrations?: GoogleSheetsIntegration[];
  }> | null;
  loadingAllProfiles: boolean;
  loadAllAccountsProfiles: () => Promise<void>;
}

const AccountsContext = createContext<AccountsContextType | undefined>(
  undefined
);

export const AccountsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user, loading: authLoading, activeWorkspaceId } = useAuth();
  const [allAccountsWithProfiles, setAllAccountsWithProfiles] = useState<Array<{
    accountId: number;
    accountName: string;
    profiles: AccountProfileOption[];
    google_sheets_integrations?: GoogleSheetsIntegration[];
  }> | null>(null);
  const [loadingAllProfiles, setLoadingAllProfiles] = useState(false);
  const profilesCacheRef = useRef<ProfilesCache>({});

  // Determine if user is authenticated
  // Check both auth context (Auth0) and localStorage (traditional login)
  const isAuthenticated = useMemo(() => {
    // If auth is still loading, don't enable the query yet
    if (authLoading) {
      return false;
    }
    // Check if user is authenticated via Auth0 or has access token from traditional login
    return !!(user || localStorage.getItem("accessToken"));
  }, [user, authLoading]);

  // Use React Query hook for accounts data (all=true for brand switcher / dropdown)
  // Only fetch accounts when user is authenticated
  const {
    data: accounts = [],
    isLoading: loading,
    error,
    refetch,
  } = useAccountsQuery({
    enabled: isAuthenticated,
    all: true,
    workspaceId: activeWorkspaceId,
  });

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

  // Get profiles from cache (returns undefined if not cached)
  const getAccountProfilesCached = useCallback(
    (accountId: number): AccountProfileOption[] | undefined => {
      return profilesCacheRef.current[accountId]?.profiles;
    },
    []
  );

  // Get Google Sheets integrations from cache (returns undefined if not cached)
  const getAccountGoogleSheetsIntegrationsCached = useCallback(
    (accountId: number): GoogleSheetsIntegration[] | undefined => {
      return profilesCacheRef.current[accountId]?.google_sheets_integrations;
    },
    []
  );

  // Fetch account profiles with caching
  const getAccountProfiles = useCallback(
    async (accountId: number): Promise<AccountProfileOption[]> => {
      // Return from cache if available
      const cached = profilesCacheRef.current[accountId];
      if (cached) {
        return cached.profiles;
      }

      try {
        const res = await accountsService.getAccountProfiles(accountId);
        const profiles = (res?.profiles || []) as AccountProfileOption[];
        const integrations = res?.google_sheets_integrations ?? [];
        // Update cache
        profilesCacheRef.current[accountId] = { profiles, google_sheets_integrations: integrations };
        return profiles;
      } catch (err) {
        console.error(`Error loading profiles for account ${accountId}:`, err);
        return [];
      }
    },
    []
  );

  // Load profiles for all accounts in a single API call (grouped by account)
  const loadAllAccountsProfiles = useCallback(async () => {
    setLoadingAllProfiles(true);
    try {
      const list = await accountsService.getAccountsWithProfiles();
      const results: Array<{
        accountId: number;
        accountName: string;
        profiles: AccountProfileOption[];
        google_sheets_integrations?: GoogleSheetsIntegration[];
      }> = list.map((a) => {
        const profiles = ((a.profiles || []) as AccountProfileOption[]).map((p) => ({
          ...p,
          account_id: p.account_id ?? a.id,
        }));
        const integrations = a.google_sheets_integrations ?? [];
        // Populate per-account cache for getAccountProfilesCached and getAccountGoogleSheetsIntegrationsCached
        profilesCacheRef.current[a.id] = { profiles, google_sheets_integrations: integrations };
        return {
          accountId: a.id,
          accountName: a.name || "",
          profiles,
          google_sheets_integrations: integrations,
        };
      });
      setAllAccountsWithProfiles(results);
    } catch (err) {
      console.error("Error loading all account profiles:", err);
      setAllAccountsWithProfiles([]);
    } finally {
      setLoadingAllProfiles(false);
    }
  }, []);

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
      getAccountProfiles,
      getAccountProfilesCached,
      getAccountGoogleSheetsIntegrationsCached,
      allAccountsWithProfiles,
      loadingAllProfiles,
      loadAllAccountsProfiles,
    }),
    [
      accounts,
      loading,
      error,
      loadAccounts,
      refreshAccounts,
      getAccountById,
      getCurrentAccount,
      getAccountProfiles,
      getAccountProfilesCached,
      getAccountGoogleSheetsIntegrationsCached,
      allAccountsWithProfiles,
      loadingAllProfiles,
      loadAllAccountsProfiles,
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
